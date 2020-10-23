<?php
$this->breadcrumbs=array(
	'Positions'=>array('index'),
	'Manage',
);

$this->menu=array(
	array('label'=>'List Position', 'url'=>array('index')),
	array('label'=>'Create Position', 'url'=>array('create')),
);

Yii::app()->clientScript->registerScript('search', "
$('.search-button').click(function(){
	$('.search-form').toggle();
	return false;
});
$('.search-form form').submit(function(){
	$.fn.yiiGridView.update('position-grid', {
		data: $(this).serialize()
	});
	return false;
});
");
?>

<h1>Manage Positions</h1>

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
	'id'=>'position-grid',
	'dataProvider'=>$dataprovider,
	'filter'=>$model,
	'columns'=>array(
		'id',
		array('name'=>'danse', 'header'=>'Danse', 'value'=>'$data->danse->name'),
		'name',
		'description',
		'image',
		'dateCreate',
		array(
			'name'=>'userCreate_id',
			'value'=>'$data->userCreate->username',
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
					'label'=>'Valider la passe proposée',
					'imageUrl'=>Yii::app()->request->baseUrl.'/images/tick.png',
					'url'=>'Yii::app()->createUrl("position/valid", array("id"=>$data->id))',
					'visible'=>'$data->pending'
				)
			),
		),
	),
)); ?>
