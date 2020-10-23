<?php
$this->breadcrumbs=array(
	'Videos'=>array('index'),
	$model->name,
);

$this->menu=array(
	array('label'=>'Modifier', 'url'=>array('update', 'id'=>$model->id), 'visible'=>$model->userCreate_id==Yii::app()->user->id),
	array('label'=>'Supprimer', 'url'=>'#', 'linkOptions'=>array('submit'=>array('delete','id'=>$model->id),'confirm'=>'Are you sure you want to delete this item?'), 'visible'=>$model->userCreate_id==Yii::app()->user->id),	
);
?>

<h1>Video <?php echo $model->name; ?></h1>

<?php $this->widget('zii.widgets.CDetailView', array(
	'data'=>$model,
	'attributes'=>array(
		array(               
            'name'=>'Cours',
            'type'=>'raw',
            'value'=>CHtml::link(
				CHtml::encode($model->enchainement->lesson->name),
                array('lesson/view','id'=>$model->enchainement->lesson->id)
			),
		),	
		array(               
            'name'=>'enchainement_id',
            'type'=>'raw',
            'value'=>CHtml::link(
				CHtml::encode($model->enchainement->name),
                array('enchainement/view','id'=>$model->enchainement->id)
			),
		),	
		'description',
		'dateCreate',
	),
)); ?>

<iframe width="560" height="315" src="http://www.youtube.com/embed/<?php echo $model->youtube_url;?>?rel=0" frameborder="0" allowfullscreen></iframe>
