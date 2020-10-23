<?php
$this->breadcrumbs=array(
	'Passes'=>array('index'),
	'Manage',
);

$this->menu=array(
	array('label'=>'List Passe', 'url'=>array('index')),
	array('label'=>'Create Passe', 'url'=>array('create')),
);

Yii::app()->clientScript->registerScript('search', "
$('.search-button').click(function(){
	$('.search-form').toggle();
	return false;
});
$('.search-form form').submit(function(){
	$.fn.yiiGridView.update('passe-grid', {
		data: $(this).serialize()
	});
	return false;
});
");
?>

<h1>Manage Passes</h1>

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

<?php $this->widget('zii.widgets.grid.CGridView', array(
	'id'=>'passe-grid',
	'dataProvider'=>$model->search(),
	'filter'=>$model,
	'columns'=>array(
		'id',
		'name',
		array(
			'name'=>'positionStart_id',
			'value'=>'$data->positionStart->name',
		),
		array(
			'name'=>'positionEnd_id',
			'value'=>'$data->positionEnd->name',
		),
		'difficulty',
		'description',		
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
					'url'=>'Yii::app()->createUrl("passe/valid", array("id"=>$data->id))',
					'visible'=>'$data->pending'
				)
			),
		),
	),
)); ?>
