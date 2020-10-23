<?php
$this->breadcrumbs=array(
	'Schools'=>array('index'),
	'Manage',
);

$this->menu=array(
	array('label'=>'List School', 'url'=>array('index')),
	array('label'=>'Create School', 'url'=>array('create')),
);

Yii::app()->clientScript->registerScript('search', "
$('.search-button').click(function(){
	$('.search-form').toggle();
	return false;
});
$('.search-form form').submit(function(){
	$.fn.yiiGridView.update('school-grid', {
		data: $(this).serialize()
	});
	return false;
});
");
?>

<h1>Manage Schools</h1>

<p>
You may optionally enter a comparison operator (<b>&lt;</b>, <b>&lt;=</b>, <b>&gt;</b>, <b>&gt;=</b>, <b>&lt;&gt;</b>
or <b>=</b>) at the beginning of each of your search values to specify how the comparison should be done.
</p>

<?php echo CHtml::link('Advanced Search','#',array('class'=>'search-button')); ?>
<div class="search-form" style="display:none">
<?php $this->renderPartial('_search',array(
	'model'=>$model,
)); ?>
</div><!-- search-form -->

<?php 
	$dataprovider = $model->search();
	$dataprovider->sort->defaultOrder='pending DESC';
	
	$this->widget('zii.widgets.grid.CGridView', array(
	'id'=>'school-grid',
	'dataProvider'=>$dataprovider,
	'filter'=>$model,
	'columns'=>array(
		'id',
		'name',
		'adress',
		'postal_code',
		'city',
		'url',
		array(
			'name'=>'userManager_id',
			'value'=>'$data->userManager->username',
		),
		array(
			'name'=>'pending',
			'value'=>'$data->pending ? "Oui" : "Non"',
		),
		array(
			'class'=>'CButtonColumn',
			'template'=>'{valid}{update}{delete}',
			'buttons'=>array(			
				'valid' => array
				(
					'label'=>'Valider l école proposée',
					'imageUrl'=>Yii::app()->request->baseUrl.'/images/tick.png',
					'url'=>'Yii::app()->createUrl("school/valid", array("id"=>$data->id))',
					'visible'=>'$data->pending'
				)
			),
		),
	),
)); ?>
